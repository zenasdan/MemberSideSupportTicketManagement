(function () {
    'use strict'

    angular.module(AppName).component('supportTicketMember', {
        bindings: {},
        templateUrl: "/scripts/components/views/SupportTicketMember.html",
        controller: function (requestService, $scope, $timeout, $filter, $window, $uibModal, $serverModel, $anchorScroll, $location) {
            var vm = this;
            //FUNCTIONS
            vm.$onInit = _init;
            vm.createTicket = _createTicket;
            vm.editTicket = _editTicket;
            vm.updateTicket = _updateTicket;
            vm.resetForm = _resetForm;
            vm.setSearchCriteria = _setSearchCriteria;
            vm.checkIfEmpty = _checkIfEmpty;
            vm.updateTicketsDisplay = _updateTicketsDisplay;
            vm.launchResponseModal = _launchResponseModal;
            vm.scrollToTop = _scrollToTop;
            vm.getTypeId = _getTypeId;
            vm.setSearchModelSort = _setSearchModelSort;
            //ARRAYS
            vm.filteredTicketsArray = [];
            vm.issueCatArray = [];
            vm.issueLogStatusTypeArray = [];
            vm.searchOptionsArray = [];
            vm.sortOrderArray = [];
            //OBJECTS
            vm.ticketModel = {};
            vm.searchModel = {};

            function _init() {
                $scope.itemsPerPage = 10;
                $scope.maxSize = 8;
                //CAN TURN THIS INTO A GET CALL IN THE DATABASE
                vm.searchOptionsArray = [
                    { id: 1, name: "title", viewTitle: "Title" },
                    { id: 2, name: "description", viewTitle: "Description" },
                    { id: 3, name: "statusTypeName", viewTitle: "Status" },
                    { id: 4, name: "referenceNum", viewTitle: "Reference Number" },
                    { id: 5, name: "categoryTypeName", viewTitle: "Category" }
                ]
                vm.sortOrderArray = [
                    { id: 1, type: "Asc" },
                    { id: 2, type: "Desc" }
                ]
                vm.searchModel.searchOptions = "title";
                vm.searchOptionsViewTitle = 'Title';
                //GET ISSUE CATEGORIES
                requestService.ApiRequestService("GET", "\/api/Issues/categories", null)
                    .then(function (response) {
                        vm.issueCatArray = response.items;
                    })
                    .catch(function (err) {
                    })
                //GET ISSUE LOG STATUSES
                requestService.ApiRequestService("GET", "\/api/Issues/Statuses", null)
                    .then(function (response) {
                        vm.issueLogStatusTypeArray = response.items;
                        vm.ticketModel.issueLogStatusTypeId = _getTypeId(vm.issueLogStatusTypeArray, "New");
                    })
                    .catch(function (err) {
                    })

                if ($serverModel.id) {
                    requestService.ApiRequestService("GET", "\/api/Issues/Records/" + $serverModel.id, null)
                        .then(function (response) {
                            vm.ticketModel.referenceNum = response.item.referenceNum;
                            vm.ticketModel.title = response.item.title;
                            vm.ticketModel.description = response.item.description;
                            vm.ticketModel.issueLogStatusTypeId = response.item.issueLogStatusTypeId;
                            vm.ticketModel.issueCategoryTypeId = response.item.issueCategoryTypeId;
                        })
                        .catch(function (err) {
                        })
                }

                //GET ISSUES BY USER
                vm.searchModel.sortOrder = 'Asc';
                vm.searchModel.ticketSearchVal = '';
                _checkIfEmpty();
            }

            function _setSearchModelSort(type) {
                vm.searchModel.sortOrder = type;
            }

            function _updateTicketsDisplay() {
                requestService.ApiRequestService("POST", "\/api/Issues/Users/Records/", vm.searchModel)
                    .then(function (response) {
                        response.items.forEach(function (item) {
                            item.createdDate = moment(item.createdDate).format('L');
                        })
                        vm.filteredTicketsArray = response.items;
                        if (vm.filteredTicketsArray.length > 0)
                            $scope.totalItems = vm.filteredTicketsArray[0].totalIssues;
                    })
                    .catch(function (err) {
                        swal("Oops!", "Unfortunately, we were unable to retrieve your tickets: " + err.data, "error");
                    })
            }

            function _createTicket(form) {
                vm.ticketModel.issueLogStatusTypeId = _getTypeId(vm.issueLogStatusTypeArray, "Submitted");
                requestService.ApiRequestService("POST", "\/api/Issues/Records", vm.ticketModel)
                    .then(function (response) {
                        swal("Congratulations!", "Your ticket was successfully submitted. Here is your Reference Number: " + response.item.referenceNum, "success");
                        _resetForm(form);
                        _updateTicketsDisplay();
                    })
                    .catch(function (err) {
                        swal("Oops!", "Unfortunately, we were unable to submit your ticket: " + err.data, "error");
                    })
            }

            function _editTicket(ticket) {
                vm.ticketModel.referenceNum = ticket.referenceNum;
                vm.ticketModel.title = ticket.title;
                vm.ticketModel.issueCategoryTypeId = _getTypeId(vm.issueCatArray, ticket.categoryTypeName);
                vm.ticketModel.description = ticket.description;
                vm.ticketModel.issueLogStatusTypeId = _getTypeId(vm.issueLogStatusTypeArray, ticket.statusTypeName);
                $scope.active = $scope.index = 0;
            }

            function _getTypeId(array, name) {
                var tempArray = array.filter(function (obj) {
                    if (obj.typeName == name)
                        return obj.id;
                });
                return tempArray[0].id;
            }

            function _updateTicket(form) {
                requestService.ApiRequestService("PUT", "\/api/Issues/Records/ReferenceNumber/" + vm.ticketModel.referenceNum, vm.ticketModel)
                    .then(function (response) {
                        swal("Congratulations!", "Your ticket was successfully updated.", "success");
                        _resetForm(form);
                        _updateTicketsDisplay();
                        $timeout(function () { location.href = "/Member/issues"; }, 5000);
                    })
                    .catch(function (err) {
                        swal("Oops!", "Unfortunately, we were unable to update your ticket: " + err.data, "error");
                    })
            }

            function _resetForm(form) {
                vm.ticketModel = {};
                form.$setPristine();
                form.$setUntouched();
                vm.ticketModel.issueLogStatusTypeId = _getTypeId(vm.issueLogStatusTypeArray, "New");
            }

            function _setSearchCriteria(option) {
                vm.searchModel.searchOptions = option.name;
                vm.searchOptionsViewTitle = option.viewTitle;
            }

            function _checkIfEmpty() {
                if (vm.searchModel.ticketSearchVal == '') {
                    vm.searchModel.currentPage = 1;
                    _updateTicketsDisplay();
                }
            }

            function _launchResponseModal(ticket) {
                var statusTypeArray = [];
                var modalInstance = $uibModal.open({
                    animation: vm.animationsEnabled,
                    component: 'issueLogResponseModal',
                    size: 'lg',
                    resolve: {
                        ticket: function () {
                            return ticket;
                        },
                        statusTypeArray: function () {
                            return vm.issueLogStatusTypeArray;
                        },
                        getTypeId: function () {
                            return vm.getTypeId;
                        }
                    }
                });

                modalInstance.result.then(function (selectedItem) {
                    _updateTicketsDisplay();
                }, function () {
                    _updateTicketsDisplay();
                });
            }

            function _scrollToTop() {
                _updateTicketsDisplay();
                $location.hash('ticketsTable');
                $anchorScroll();
            }
        }
    })
})();