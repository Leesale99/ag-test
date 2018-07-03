/**
 * Created by Antonio on 06/05/2017.
 */
define([
  'jquery',
  'css!jquery-ui-themes/base/all.css',
  'css!style/search-form.css'
], function($) {
  var logSteamEndpoint =
    'http://ag-messagebroker.westeurope.cloudapp.azure.com:8080/secure/monitor/casino-gameengine-error';
  var logFilter = '?filter={%27message%27:{%27$regex%27:%27{searchText}%27}}';

  var SearchForm = function(config) {
    if (!config || !config.container)
      throw new Error('Please provide the container parameter!');

    this.bind(config.container);
  };

  SearchForm.prototype = {
    bind: function(container) {
      this.$searchText = $('.searchText', container);
      this.$searchButton = $('.searchButton', container);
      this.$searchResult = $('.searchFormResult', container);
      this.$searchTitle = $('.searchTitle', container);
      this.$searchResultContainer = $('.searchFormResultContainer', container);
      this.$resultTemplate = $('.searchFormResultTemplate', container).detach();
      this.$overlay = $('.overlay', container);
      this.$dialog = $('#dialog');

      this.itemsLog = {};

      var thisInstance = this;
      this.$searchButton.click(function(e) {
        e.preventDefault();
        var searchText = thisInstance.$searchText.val();
        thisInstance.loading();

        if (!searchText) {
          thisInstance.$dialog.find('p').text('Please provide a search term.');
          thisInstance.$dialog.dialog({
            title: 'Missing search term',
            close: function() {
              thisInstance.$searchTitle
                .text('Please provide a search parameter to begin searching.')
                .removeClass('hidden');
              thisInstance.$overlay.addClass('loaded');
            }
          });
          thisInstance.$dialog.dialog('open');
        }

        thisInstance.search(searchText);
      });
    },
    loading: function() {
      this.$overlay.removeClass('loaded');
      this.$searchTitle.addClass('hidden');
      this.$searchResult.addClass('hidden');
      this.$searchResultContainer.empty();
    },
    loaded: function() {
      this.$searchTitle.addClass('hidden');
      this.$searchResult.removeClass('hidden');
      this.$overlay.addClass('loaded');
    },
    search: function(searchText) {
      var thisInstance = this;
      this.getLogData(searchText)
        .fail(function(jqXHR, textStatus, errorThrown) {
          thisInstance.$searchTitle
            .text('HTTP 500 - Internal Server Error')
            .removeClass('hidden');
          thisInstance.$overlay.addClass('loaded');
        })
        .done(function(data) {
          var dataWithMessage = data._embedded['rh:doc'][0].hasOwnProperty(
            'message'
          );
          if (data._returned && dataWithMessage) {
            thisInstance.renderResult(data._embedded['rh:doc']);
            setTimeout(function() {
              thisInstance.loaded();
            }, 500);
          } else if (!data._returned) {
            thisInstance.$searchTitle
              .text('No results for the searched term: ' + searchText)
              .removeClass('hidden');
            thisInstance.$overlay.addClass('loaded');
          }
        });
    },
    renderResult: function(data) {
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        if (!item.message) return;

        var $resultRow = this.$resultTemplate.clone();
        var $resultDetailsBtn =
          '<button class="logButton smallButton" data-id="' +
          item._id.$oid +
          '">show log</button>';
        var formattedDate =
          new Date(item.timestamp).toLocaleDateString() +
          ' ' +
          new Date(item.timestamp).toLocaleTimeString();
        var messageList = item.message.split(' - ');
        var message = messageList[0] + ' - ' + messageList[1];
        var casino = messageList[3];
        var table = messageList[4];
        var tableType = messageList[5];
        var log = messageList[2];

        $('.searchFormResultDate', $resultRow).html(formattedDate);
        $('.searchFormResultMessage', $resultRow).html(message);
        $('.searchFormResultCasino', $resultRow).html(casino);
        $('.searchFormResultTable', $resultRow).html(table);
        $('.searchFormResultTableType', $resultRow).html(tableType);
        $('.searchFormResultDetails', $resultRow).html($resultDetailsBtn);

        this.itemsLog[item._id.$oid] = log;
        this.$searchResultContainer.append($resultRow);
      }
      var thisInstance = this;
      $('.logButton').click(function() {
        var id = $(this).data('id');
        var log = thisInstance.itemsLog[id];
        thisInstance.$dialog.find('p').text(log);
        thisInstance.$dialog.dialog({
          title: id,
          close: thisInstance.loaded()
        });
        thisInstance.$dialog.dialog('open');
      });
    },
    getLogData: function(searchText) {
      var queryURL =
        logSteamEndpoint +
        (searchText ? logFilter.replace('{searchText}', searchText) : '');

      return $.ajax({
        type: 'GET',
        contentType: 'application/json; charset=UTF-8',
        url: queryURL,
        headers: {
          Authorization: 'Basic ' + btoa('admin' + ':' + '1Password')
        },
        timeout: 3000
      });
    }
  };

  return SearchForm;
});
